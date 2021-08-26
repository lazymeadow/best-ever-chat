package com.bestevarchat.chat

object MessagesProvider {
	private val messages = mutableMapOf<String, MutableList<ChatMessage>>()
	private val subscribers = mutableMapOf<String, MutableList<() -> Unit>>()

	/**
	 * Adds messages to a room
	 *
	 * @param room The room to add messages to
	 * @param messages The messages to add to the room
	 */
	fun addMessages(room: String, messages: List<ChatMessage>) {
		this.messages.getOrPut(room, { mutableListOf() }).addAll(messages)
		notifySubscribers(room)
	}

	/**
	 * @param room The room to get messages for
	 *
	 * @return The messages in the room
	 */
	fun getMessages(room: String): List<ChatMessage> {
		return messages.getOrPut(room, { mutableListOf() })
	}

	/**
	 * Registers an observer to be executed when a room's messages are modified
	 *
	 * @param room The room to observe
	 * @param observer A function to invoke when the observed room's list of messages changes
	 */
	fun onDataSetChanged(room: String, observer: () -> Unit) {
		subscribers.getOrPut(room, { mutableListOf() }).add(observer)
	}

	private fun notifySubscribers(room: String) {
		subscribers[room]?.forEach { it.invoke() }
	}
}
