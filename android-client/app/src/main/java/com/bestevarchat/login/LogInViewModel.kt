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
	fun authenticate(username: String, password: String) {
		viewModelScope.launch(Dispatchers.IO) {
			authenticateResponse.postValue(authService.authenticate(username, password))
		}
	}
}
