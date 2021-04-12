package com.bestevarchat.chat

object MessagesProvider {
	private val messages = mutableListOf<ChatMessage>()
	private val subscribers = mutableListOf<() -> Unit>()

	fun addMessages(messages: List<ChatMessage>) {
		this.messages.addAll(messages)
		notifySubscribers()
	}

	fun getMessages(): List<ChatMessage> {
		return messages
	}

	fun onDataSetChanged(observer: () -> Unit) {
		subscribers.add(observer)
	}

	private fun notifySubscribers() = subscribers.forEach { it.invoke() }
}
