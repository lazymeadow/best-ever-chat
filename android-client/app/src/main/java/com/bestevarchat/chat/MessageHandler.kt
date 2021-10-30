package com.bestevarchat.chat

import org.json.JSONArray
import org.json.JSONObject

private const val MESSAGE_KEY_DATA = "data"
private const val MESSAGE_KEY_TYPE = "type"
private const val MESSAGE_DATA_KEY_ROOMS = "rooms"
private const val MESSAGE_DATA_ROOMS_KEY_HISTORY = "history"
private const val MESSAGE_DATA_ROOMS_KEY_NAME = "name"
private const val MESSAGE_DATA_ROOMS_HISTORY_KEY_MESSAGE = "message"
private const val MESSAGE_DATA_ROOMS_HISTORY_KEY_USERNAME = "username"

private const val TYPE_ROOM_DATA = "room data"

object MessageHandler {
	/**
	 * Parses a message and updates app state accordingly
	 *
	 * @param message The message to parse
	 */
	fun handle(message: String?) {
		// SockJS prepends characters to the otherwise pure JSON message. We need to remove those before we can parse
		// the message into an object.
		val messageJsonArray = if (message == null || message.length <= 1) {
			JSONArray()
		} else {
			JSONArray(message.substring(1))
		}

		for (i in 0 until messageJsonArray.length()) {
			val messageElementJsonObject = messageJsonArray.getJSONObject(i)
			when (messageElementJsonObject.getString(MESSAGE_KEY_TYPE)) {
				TYPE_ROOM_DATA -> handleRoomDataMessage(messageElementJsonObject)
			}
		}
	}

	private fun handleRoomDataMessage(messageElementJsonObject: JSONObject) {
		val dataJsonObject = messageElementJsonObject.getJSONObject(MESSAGE_KEY_DATA)
		val roomsJsonArray = dataJsonObject.getJSONArray(MESSAGE_DATA_KEY_ROOMS)

		for (i in 0 until roomsJsonArray.length()) {
			val messages = mutableListOf<ChatMessage>()
			val roomsElementJsonObject = roomsJsonArray.getJSONObject(i)

			val historyJsonArray = roomsElementJsonObject.getJSONArray(MESSAGE_DATA_ROOMS_KEY_HISTORY)
			for (j in 0 until historyJsonArray.length()) {
				val historyElementJsonObject = historyJsonArray.getJSONObject(j)
				messages.add(
					ChatMessage(
						message = historyElementJsonObject.optString(
							MESSAGE_DATA_ROOMS_HISTORY_KEY_MESSAGE
						),
						username = historyElementJsonObject.getString(
							MESSAGE_DATA_ROOMS_HISTORY_KEY_USERNAME
						)
					)
				)
			}

			MessagesProvider.addMessages(roomsElementJsonObject.getString(MESSAGE_DATA_ROOMS_KEY_NAME), messages)
		}
	}
}
