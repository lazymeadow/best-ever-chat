package com.bestevarchat

import android.content.Context
import androidx.core.content.edit
import com.android.volley.NetworkResponse
import com.android.volley.ParseError
import com.android.volley.Response
import com.android.volley.toolbox.HttpHeaderParser
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import org.json.JSONException
import org.json.JSONObject
import java.lang.IllegalStateException
import java.net.HttpCookie

private const val LOGIN_URL = "https://bestevarchat.com/login"

/**
 * Authentication-related methods
 */
object AuthService {
	const val PREFERENCES_NAME = "auth"
	const val PREFERENCE_COOKIE = "cookie"

	data class AuthResponse(val success: Boolean, val message: String? = null)

	/**
	 * Retrieves an authentication cookie using the given username and password
	 *
	 * @param context A Context to associate with this method's Volley queue
	 * @param username The username to authenticate with
	 * @param password The password to authenticate with
	 * @param callback A callback to execute after completing the authentication request
	 */
	fun authenticate(
		context: Context,
		username: String,
		password: String,
		callback: ((AuthResponse) -> Unit)?
	) {
		val queue = Volley.newRequestQueue(context)

		val body = JSONObject()
		body.put("parasite", username)
		body.put("password", password)

		val authRequest = object : JsonObjectRequest(Method.POST, LOGIN_URL, body,
			{ response ->
				try {
					val data = response.getJSONObject("data")
					val headers = response.getJSONObject("headers")

					val success = data.getBoolean("success")
					if (success) {
						val cookie = HttpCookie.parse(headers.getString("Set-Cookie")).first {
							it.name == data.getString("cookie name")
						}

						context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE).edit {
							putString(PREFERENCE_COOKIE, "${cookie.name}=${cookie.value}")
						}
					}

					callback?.let { it(AuthResponse(success)) }
				} catch (e: JSONException) {
					callback?.let { it(AuthResponse(false, e.message)) }
				}
			},
			{ error ->
				callback?.let { it(AuthResponse(false, error.message)) }
			}
		) {
			override fun getBodyContentType(): String {
				/**
				 * Volley automatically sets the Content-Type header to
				 * "application/json; charset=utf-8", which our server doesn't like
				 */
				return "application/json"
			}

			override fun parseNetworkResponse(response: NetworkResponse?): Response<JSONObject> {
				try {
					val responseWithHeaders = JSONObject()
					responseWithHeaders.put(
						"headers",
						JSONObject(response?.headers as Map<*, *>)
					)
					responseWithHeaders.put("data", JSONObject(String(response.data)))

					return Response.success(
						responseWithHeaders,
						HttpHeaderParser.parseCacheHeaders(response)
					)
				} catch (e: JSONException) {
					return Response.error(ParseError(e))
				}
			}
		}

		queue.add(authRequest)
	}

	/**
	 * @return A stored authentication cookie
	 */
	fun getAuthCookie(context: Context): String {
		val cookie = context
			.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
			.getString(PREFERENCE_COOKIE, null)

		return cookie
			?: throw IllegalStateException(
				"Attempted to get the authentication cookie before authenticating"
			)
	}

	fun isAuthenticated(context: Context): Boolean {
		return context
			.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
			.contains(PREFERENCE_COOKIE)
	}
}
