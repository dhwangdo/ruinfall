"""Fit the finite integer maximum-entropy deck model; export small exact rejection samplers.

Run from repository root with Python, NumPy and SciPy. No optimizer runs in the game.
"""
import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
from pathlib import Path
from itertools import product
import argparse
import json
import math
import time
import re
import numpy as np
from scipy.optimize import minimize
from scipy.special import logsumexp

ROOT = Path(__file__).resolve().parents[2]
A = np.array([12., 8., 6., 15., 5.])
PAIRS = [(i,j) for i in range(5) for j in range(i,5)]
SPREAD = .05
MEAN_BASE = np.array([.5, 1.125, .375, .5, 1.])
MEAN_GROWTH = np.array([.5, .375, .125, .5, .5])
SIGMA_BASE, SIGMA_GROWTH = 15., 3.
EDITION_SOURCE = (ROOT/'godot/scripts/deck_editions.gd').read_text(encoding='utf-8')
EDITION_IDS = re.findall(r'"([^"]+)"', re.search(r'const IDS: Array\[String\] = \[(.*?)\]', EDITION_SOURCE, re.S)[1])
EDITION_SCORE_MAP = {key: int(value) for key,value in re.findall(r'"([^"\n]+)": (\d+)', re.search(r'const SCORES := \{(.*?)\}', EDITION_SOURCE, re.S)[1])}
EDITION_SCORES = [EDITION_SCORE_MAP[key] for key in EDITION_IDS]
PATTERNS = {}
for bits in product([0,1], repeat=len(EDITION_IDS)):
    score = sum(b*s for b,s in zip(bits, EDITION_SCORES))
    PATTERNS.setdefault(score, set()).add(tuple(bits[EDITION_IDS.index(key)] for key in ["gambit","fantastic","legendCassiopeia"]))


def fit(region):
    started = time.perf_counter()
    mean = MEAN_BASE + MEAN_GROWTH*(region-1)
    sigma = SIGMA_BASE+SIGMA_GROWTH*(region-1)
    lam = sigma*sigma/float(A@A)
    scale = math.sqrt(lam)
    covariance = lam*(np.eye(5)+SPREAD*(np.eye(5)-np.outer(A,A)/(A@A)))
    # Explicit contiguous finite support, generous for the near-geometric empty-slot tail.
    upper = np.ceil(mean+7*scale).astype(int)
    upper[2] = max(upper[2], math.ceil(-math.log(1e-8)/math.log(1+1/mean[2])))
    upper[3] = min(17, upper[3])
    v = np.indices(tuple(upper+1), dtype=np.int16).reshape(5,-1).T
    capacity = 20+5*v[:,0].astype(np.int32)
    valid = np.zeros(len(v), dtype=bool)
    for z, patterns in PATTERNS.items():
        for gambit, compression, bound in patterns:
            cap = capacity-20*gambit
            if compression:
                cap = cap*4//5
            valid |= (v[:,3]==z)&(cap>0)&(v[:,1]+v[:,2]+bound<=cap)&(v[:,4]<=cap-v[:,2])
    v = v[valid]
    t = (v.astype(float)-mean)/scale
    target = covariance/lam
    f = np.column_stack([t]+[(t[:,i]*t[:,j]-target[i,j])[:,None] for i,j in PAIRS])

    def objective(theta):
        logs = f@theta
        normalizer = logsumexp(logs)
        p = np.exp(logs-normalizer)
        return normalizer, f.T@p

    theta = np.zeros(20)
    for k,(i,j) in enumerate(PAIRS,5):
        if i==j:
            theta[k] = -.5
    opt = minimize(objective, theta, jac=True, method="L-BFGS-B",
                   options={"maxiter":1000,"gtol":2e-9,"ftol":1e-15,"maxcor":25})
    value, gradient = objective(opt.x)
    if np.max(abs(gradient)) > 2e-5:
        raise RuntimeError((region,opt.message,gradient))
    p = np.exp(f@opt.x-value)
    actual_mean = p@v
    centered = v-actual_mean
    actual_cov = (centered.T*p)@centered
    eigenvalues,eigenvectors = np.linalg.eigh(actual_cov)
    h = opt.x[:5]
    q = np.zeros((5,5))
    for coefficient,(i,j) in zip(opt.x[5:],PAIRS):
        q[i,j] = coefficient
    envelope = np.zeros(5)
    for i,j in PAIRS:
        if i!=j:
            envelope[i] += abs(q[i,j])/2
            envelope[j] += abs(q[i,j])/2
    cdfs, logzs = [], []
    for i in range(5):
        axis = (np.arange(upper[i]+1)-mean[i])/scale
        logs = h[i]*axis+(q[i,i]+envelope[i])*axis*axis
        logz = logsumexp(logs)
        cdf = np.cumsum(np.exp(logs-logz)); cdf[-1] = 1.
        cdfs.append(cdf.tolist()); logzs.append(float(logz))
    logzp = value+sum(q[i,j]*target[i,j] for i,j in PAIRS)
    acceptance = math.exp(logzp-sum(logzs))
    boundary = [float(p[v[:,i]==upper[i]].sum()) for i in range(5)]
    record = dict(region=region, mean=mean.tolist(), score_sigma=sigma, scale=scale,
                  upper=upper.tolist(), linear=h.tolist(), quadratic=q.tolist(), envelope=envelope.tolist(),
                  proposal_cdfs=cdfs)
    report = dict(region=region, states=len(v), mean=actual_mean.tolist(),
                  covariance=actual_cov.tolist(), score_mean=float(actual_mean@A),
                  score_stddev=math.sqrt(float(A@actual_cov@A)),
                  eigenvalues=eigenvalues.tolist(), minimum_direction_cosine=abs(float(eigenvectors[:,0]@A/np.linalg.norm(A))),
                  max_moment_error=float(abs(gradient).max()), upper_boundary_probability=boundary,
                  acceptance=acceptance, entropy=float(value-opt.x@gradient), seconds=time.perf_counter()-started,
                  marginals=[np.bincount(v[:,i],weights=p,minlength=int(upper[i])+1).tolist() for i in range(5)])
    print(json.dumps({k:report[k] for k in ['region','states','score_stddev','max_moment_error','acceptance','upper_boundary_probability','seconds']}), flush=True)
    return record, report


if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument('--regions',type=int,nargs='+',default=list(range(1,11)))
    parser.add_argument('--output',default='godot/assets/data/deck_maxent.json')
    args=parser.parse_args(); records=[];reports=[]
    for region in args.regions:
        record,report=fit(region);records.append(record);reports.append(report)
    path=ROOT/args.output;path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(dict(model='maxent-v2',weights=A.tolist(),perpendicular_spread=SPREAD,edition_ids=EDITION_IDS,edition_scores=EDITION_SCORE_MAP,mean_base=MEAN_BASE.tolist(),mean_growth=MEAN_GROWTH.tolist(),sigma_base=SIGMA_BASE,sigma_growth=SIGMA_GROWTH,regions=records),separators=(',',':')),encoding='utf-8')
    reportpath=ROOT/'docs/data/deck-maxent-validation.json'
    reportpath.parent.mkdir(parents=True,exist_ok=True)
    reportpath.write_text(json.dumps(reports,indent=2),encoding='utf-8')
