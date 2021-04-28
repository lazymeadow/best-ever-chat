package com.bestevarchat.chat

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert
import org.junit.Test
import org.junit.runner.RunWith

private const val TEST_ROOM = "The Shire"

@RunWith(AndroidJUnit4::class)
class MessageHandlerTest {
	@Test
	fun handleRoomDataMessage() {
		MessageHandler.handle(ROOM_DATA_JSON)

		val messages = MessagesProvider.getMessages(TEST_ROOM)
		Assert.assertEquals(3, messages.size)
	}
}