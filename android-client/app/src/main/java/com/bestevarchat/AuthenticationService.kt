package com.bestevarchat

import org.json.JSONObject
import java.lang.IllegalStateException
import java.net.HttpCookie
import java.net.URL
import javax.net.ssl.HttpsURLConnection

private const val URL = "https://bestevarchat.com/login"

object AuthenticationService {
    data class AuthenticateResponse(val success: Boolean, val message: String? = null)

    private var cookie: HttpCookie? = null
    private var isAuthenticated = false

    fun authenticate(username: String, password: String): AuthenticateResponse {
        val url = URL(URL);
        (url.openConnection() as HttpsURLConnection).run {
            requestMethod = "POST"
            setRequestProperty("content-type", "application/json")
            doOutput = true

            val json = "{\"parasite\":\"$username\",\"password\":\"$password\"}"
            val jsonBytes = json.toByteArray()
            outputStream.write(jsonBytes)

            if (responseCode == 200) {
                inputStream.let { inputStream ->
                    val responseJson = JSONObject(readStream(inputStream))

                    val success = responseJson.getBoolean("success")
                    if (success) {
                        cookie = HttpCookie.parse(getHeaderField("set-cookie")).first {
                            it.name == responseJson.getString("cookie name")
                        }
                        isAuthenticated = true
                    }

                    return AuthenticateResponse(success)
                }
            } else {
                errorStream.let { errorStream ->
                    return AuthenticateResponse(false, readStream(errorStream))
                }
            }
        }
    }

    fun getAuthenticationCookie(): HttpCookie {
        if (!isAuthenticated) {
            throw IllegalStateException("Attempted to get the authentication cookie before authenticating")
        }

        // If we set isAuthenticated to true, cookie must be set
        return cookie as HttpCookie
    }
}
