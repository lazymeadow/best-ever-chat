package com.bestevarchat.login

import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bestevarchat.AuthenticationService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class LogInViewModel(
    val authenticateResponse: MutableLiveData<AuthenticationService.AuthenticateResponse> = MutableLiveData(),
    private val authService: AuthenticationService = AuthenticationService
) : ViewModel() {
//    private lateinit var webSocketClient: WebSocketClient

//    init {
//        viewModelScope.launch(Dispatchers.IO) {
//            // https://medium.com/swlh/android-tutorial-part-1-using-java-websocket-with-kotlin-646a5f1f09de
//            webSocketClient = object : WebSocketClient(URI("wss://ws-feed.pro.coinbase.com")) {
//                override fun onClose(code: Int, reason: String?, remote: Boolean) {
//                    Log.d("coinBase", "onClose")
//                    unsubscribe()
//                }
//
//                override fun onError(ex: Exception) {
//                    Log.e("coinBase", "onError: ${ex.message}")
//                }
//
//                override fun onMessage(message: String?) {
//                    Log.d("coinBase", "onMessage: $message")
//                }
//
//                override fun onOpen(handshakeData: ServerHandshake?) {
//                    Log.d("coinBase", "onOpen")
//                    subscribe()
//                }
//            }
//
//            val socketFactory = SSLSocketFactory.getDefault()
//            webSocketClient.setSocketFactory(socketFactory)
//            webSocketClient.connect()
//        }
//    }

    fun authenticate(username: String, password: String) {
        viewModelScope.launch(Dispatchers.IO) {
            authenticateResponse.postValue(authService.authenticate(username, password))
        }
    }

//    private fun subscribe() {
//        webSocketClient.send("{\"type\":\"subscribe\",\"channels\":[{\"name\":\"ticker\",\"product_ids\":[\"BTC-EUR\"]}]}")
//    }
//
//    private fun unsubscribe() {
//        webSocketClient.send("{\"type\":\"unsubscribe\",\"channels\":[\"ticker\"]}")
//    }
}
