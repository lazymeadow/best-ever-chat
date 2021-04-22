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
					Log.d("ChatViewModel Socket", "onMessage: $message")
					MessageHandler.handle(message)
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
