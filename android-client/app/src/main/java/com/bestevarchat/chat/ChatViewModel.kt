package com.bestevarchat.chat

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.bestevarchat.AuthService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import org.json.JSONArray
import java.lang.Exception
import java.net.URI
import javax.net.ssl.SSLSocketFactory

class ChatViewModel(application: Application) : AndroidViewModel(application) {
	private lateinit var webSocketClient: WebSocketClient

	init {
		viewModelScope.launch(Dispatchers.IO) {
			val headers = mapOf("cookie" to AuthService.getAuthCookie(getApplication()))

			val serverNumber = (0..9999).random()

			val sessionIdCharacters = ('a'..'z') + ('0'..'9')
			var sessionId = ""
			for (i in 1..8) {
				sessionId += sessionIdCharacters.random()
			}

			webSocketClient = object : WebSocketClient(
				URI("wss://bestevarchat.com/chat/$serverNumber/$sessionId/websocket"),
				headers
			) {
				override fun onClose(code: Int, reason: String?, remote: Boolean) {
					Log.d("ChatViewModel Socket", "onClose: $reason")
				}

				override fun onError(ex: Exception) {
					Log.e("ChatViewModel Socket", "onError: ${ex.message}")
				}

				override fun onMessage(message: String?) {
					/**
					 * SockJS prepends characters to the otherwise pure JSON message. We need to
					 * remove those before we can parse the message into an object.
					 */
					val messageJsonArray = if (message == null || message.length <= 1) {
						JSONArray()
					} else {
						JSONArray(message.substring(1))
					}

					Log.d("ChatViewModel Socket", "onMessage: $messageJsonArray")

					val generalMessages = mutableListOf<ChatMessage>()
					for (i in 0 until messageJsonArray.length()) {
						val messageElementJsonObject = messageJsonArray.getJSONObject(i)
						if (messageElementJsonObject.getString("type") == "room data") {
							val dataJsonObject = messageElementJsonObject.getJSONObject("data")
							val roomsJsonArray = dataJsonObject.getJSONArray("rooms")
							for (j in 0 until roomsJsonArray.length()) {
								val roomsElementJsonObject = roomsJsonArray.getJSONObject(j)
								if (roomsElementJsonObject.getString("name") == "General") {
									val historyJsonArray =
										roomsElementJsonObject.getJSONArray("history")
									for (k in 0 until historyJsonArray.length()) {
										val historyElementJsonObject =
											historyJsonArray.getJSONObject(k)
										val chatMessage = ChatMessage(
											"${
												historyElementJsonObject.getString("username")
											}: ${
												historyElementJsonObject.optString("message", "Alas! 'Twas an empty message.")
											}"
										)
										generalMessages.add(chatMessage)
									}
								}
							}
						}
					}

					MessagesProvider.addMessages(generalMessages)
				}

				override fun onOpen(handshakeDate: ServerHandshake?) {
					Log.d("ChatViewModel Socket", "onOpen")
				}
			}

			val socketFactory = SSLSocketFactory.getDefault()
			webSocketClient.setSocketFactory(socketFactory)
			webSocketClient.connect()
		}
	}
}
