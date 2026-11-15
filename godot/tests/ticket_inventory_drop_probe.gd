extends SceneTree

const DropArea = preload("res://scripts/run_card_drop_area.gd")
const CardSource = preload("res://scripts/battle_card_drag_source.gd")

class Game extends "res://scripts/main.gd":
	func _ready() -> void:
		_install_theme()
		set_process(false)
	func _show_deck() -> void:
		pass

func _init() -> void:
	call_deferred("run")

func run() -> void:
	var game := Game.new()
	root.add_child(game)
	game.run_state = {"position": Vector2i(3, 4), "inventory_cards": [], "inventory_consumables": [], "floor_consumable_drops": []}
	var zone := DropArea.new()
	root.add_child(zone)
	zone.run_drop_target = {"area": "inventory"}
	zone.run_drop_callback = Callable(game, "_on_run_card_dropped")
	for type in ["extractTicket", "cloneTicket", "transformTicket", "expandTicket", "bombTicket", "darkTicket", "mindEyeTicket"]:
		var ticket := {"id": type + "-1", "type": type, "name": type}
		game.run_state["inventory_consumables"] = []
		game.run_state["floor_consumable_drops"] = [{"x": 3, "y": 4, "consumable": ticket}]
		var view: Control = game._deck_editor_consumable_widget(ticket, "floor")
		root.add_child(view)
		var item: CardSource
		for child in view.get_children():
			if child is CardSource:
				item = child
		assert(is_instance_valid(item), "ticket widget missing")
		var data: Dictionary = item.run_drag_payload
		assert(data["ticket_type"] == type and data["ticket_id"] == ticket["id"])
		assert(zone._can_drop_data(Vector2.ZERO, data), "inventory rejects " + type)
		zone._drop_data(Vector2.ZERO, data)
		assert(game.run_state["inventory_consumables"].size() == 1)
		assert(game.run_state["inventory_consumables"][0] == ticket)
		assert(game.run_state["floor_consumable_drops"].is_empty())
		zone.run_drop_target = {"area": "floor"}
		data["source_area"] = "inventory"
		assert(zone._can_drop_data(Vector2.ZERO, data))
		zone._drop_data(Vector2.ZERO, data)
		assert(game.run_state["inventory_consumables"].is_empty())
		assert(game.run_state["floor_consumable_drops"][0]["consumable"] == ticket)
		zone.run_drop_target = {"area": "inventory"}
		var occupied := CardSource.new()
		root.add_child(occupied)
		occupied.run_drop_target = {"area": "inventory"}
		data["source_area"] = "floor"
		assert(occupied._can_drop_data(Vector2.ZERO, data), "occupied inventory card rejects ticket")
		occupied.run_drop_target = {"area": "deck"}
		assert(not occupied._can_drop_data(Vector2.ZERO, data), "ticket must not enter deck as a card")
		occupied.ticket_drop_target = {"action": "extract-deck-card"}
		occupied.ticket_can_drop_callback = func(_target: Dictionary, _data: Dictionary) -> bool: return true
		assert(occupied._can_drop_data(Vector2.ZERO, data) == (type == "extractTicket"), "extraction target must accept only extraction tickets")
		occupied.queue_free()
		view.queue_free()
	# A full inventory must leave the ticket on the floor.
	var filler: Array = []
	for index in range(15):
		filler.append({"id": str(index), "type": "extractTicket"})
	game.run_state["inventory_consumables"] = filler
	var last: Dictionary = game.run_state["floor_consumable_drops"][0]["consumable"]
	zone._drop_data(Vector2.ZERO, {"kind": "run-ticket", "source_area": "floor", "ticket_id": last["id"]})
	assert(game.run_state["inventory_consumables"].size() == 15)
	assert(game.run_state["floor_consumable_drops"].size() == 1)
	print("PASS: seven ticket payloads, floor/inventory round trips, occupied slots, deck rejection, full-inventory preservation")
	zone.queue_free()
	game.queue_free()
	await process_frame
	quit()
