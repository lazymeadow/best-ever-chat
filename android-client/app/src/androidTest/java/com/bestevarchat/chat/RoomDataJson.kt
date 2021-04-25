package com.bestevarchat.chat

const val ROOM_DATA_JSON = """
[
	{
		"type": "room data",
		"data": {
			"all": true,
			"rooms": [
				{
					"owner": "null",
					"id": 0,
					"name": "General",
					"history": [
						{
							"username": "Frodo",
							"color": "#00FF00",
							"message": "You're late.",
							"room id": 0,
							"time": 1.618935600000000E9
						},
						{
							"username": "Gandalf",
							"color": "#888888",
							"message": "A wizard is never late, Frodo Baggins. Nor is he early. He arrives precisely when he means to.",
							"room id": 0,
							"time": 1.618935601000000E9
						},
						{
							"username": "Frodo",
							"color": "#00FF00",
							"message": "It's wonderful to see you, Gandalf!",
							"room id": 0,
							"time": 1.618935602000000E9
						}
					],
					"members": [
						"Frodo",
						"Gandalf"
					]
				}
			]
		}
	}
]
"""
