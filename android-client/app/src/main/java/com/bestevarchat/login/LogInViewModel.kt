package com.bestevarchat.login

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import com.bestevarchat.AuthService

class LogInViewModel(application: Application) : AndroidViewModel(application) {
	val authResponse: MutableLiveData<AuthService.AuthResponse> = MutableLiveData()

	fun authenticate(username: String, password: String) {
		AuthService.authenticate(getApplication(), username, password) { response ->
			authResponse.postValue(response)
		}
	}
}
