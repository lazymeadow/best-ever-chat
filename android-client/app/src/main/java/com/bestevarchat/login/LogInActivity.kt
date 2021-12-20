package com.bestevarchat.login

import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import com.bestevarchat.AuthService
import com.bestevarchat.chat.ChatActivity
import com.bestevarchat.ui.theme.BestEvarChatTheme
import com.google.android.material.dialog.MaterialAlertDialogBuilder

class LogInActivity : ComponentActivity() {
	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
		setContent {
			BestEvarChatTheme {
				// A surface container using the 'background' color from the theme
				Surface(color = MaterialTheme.colors.background) {
					LogIn()
				}
			}
		}
	}
}

fun Context.getActivity(): ComponentActivity? = when (this) {
	is ComponentActivity -> this
	is ContextWrapper -> baseContext.getActivity()
	else -> null
}

@Composable
fun LogIn() {
	Column(
		modifier = Modifier
			.fillMaxHeight()
			.fillMaxWidth(),
		verticalArrangement = Arrangement.Center,
		horizontalAlignment = Alignment.CenterHorizontally,
	) {
		var username by remember { mutableStateOf(TextFieldValue("")) }
		TextField(value = username, onValueChange = { new -> username = new }, label = { Text("Username") })

		Spacer(modifier = Modifier.height(Dp(20F)))

		var password by remember { mutableStateOf(TextFieldValue("")) }
		TextField(
			value = password,
			onValueChange = { new -> password = new },
			label = { Text("Password") },
			visualTransformation = PasswordVisualTransformation(),
			keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
		)

		Spacer(modifier = Modifier.height(Dp(20F)))

		val context = LocalContext.current
		Button(
			onClick = {
				AuthService.authenticate(context, username.text, password.text) {
					if (it.success) {
						context.startActivity(Intent(context, ChatActivity::class.java))
						context.getActivity()?.finish()
					} else {
						MaterialAlertDialogBuilder(context)
							.setTitle("Oh no!")
							.setMessage("Something went wrong!")
							.setPositiveButton("Okay") { dialog, _ -> dialog.cancel() }
							.create()
							.show()
					}
				}
			}
		) {
			Text(text = "Log in")
		}
	}
}

@Preview(showBackground = true)
@Composable
fun DefaultPreview() {
	BestEvarChatTheme {
		LogIn()
	}
}
