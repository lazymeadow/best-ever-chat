package com.bestevarchat

import android.content.Context
import com.android.volley.NetworkResponse
import com.android.volley.ParseError
import com.android.volley.Request
import com.android.volley.Response
import com.android.volley.toolbox.HttpHeaderParser
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import org.json.JSONException
import org.json.JSONObject
import java.lang.IllegalStateException
import java.net.HttpCookie

private const val LOGIN_URL = "https://bestevarchat.com/login"

object AuthService {
	data class AuthResponse(val success: Boolean, val message: String? = null)

	private var cookie: HttpCookie? = null
	private var isAuthenticated = false

	fun authenticate(
		context: Context,
		username: String,
		password: String,
		callback: (AuthResponse) -> Unit
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
						cookie = HttpCookie.parse(headers.getString("Set-Cookie")).first {
							it.name == data.getString("cookie name")
						}
						isAuthenticated = true
					}

					callback(AuthResponse(success))
				} catch (e: JSONException) {
					callback(AuthResponse(false, e.message))
				}
			},
			{ error ->
				callback(AuthResponse(false, error.message))
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

	fun getAuthenticationCookie(): HttpCookie {
		if (!isAuthenticated) {
			throw IllegalStateException(
				"Attempted to get the authentication cookie before authenticating"
			)
		}

		// If we set isAuthenticated to true, cookie must be set
		return cookie as HttpCookie
	}
}
