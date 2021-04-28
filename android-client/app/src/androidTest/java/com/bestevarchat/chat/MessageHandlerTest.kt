package com.bestevarchat.chat

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MessageHandlerTest {
	@Test
	fun handleRoomDataMessage() {
		MessageHandler.handle(ROOM_DATA_JSON)

		val messages = MessagesProvider.getMessages("The Shire")

		assertEquals(3, messages.size)

		assertEquals("Frodo", messages[0].username)
		assertEquals("You're late.", messages[0].message)

		assertEquals("Gandalf", messages[1].username)
		assertEquals(
			"A wizard is never late, Frodo Baggins. Nor is he early. He arrives precisely when he means to.",
			messages[1].message
		)

		assertEquals("Frodo", messages[2].username)
		assertEquals("It's wonderful to see you, Gandalf!", messages[2].message)
	}
}