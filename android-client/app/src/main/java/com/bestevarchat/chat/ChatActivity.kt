package com.bestevarchat.chat

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.bestevarchat.R

class ChatActivity : AppCompatActivity() {
	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)

		setContentView(R.layout.activity_chat)
		ViewModelProvider(this).get(ChatViewModel::class.java)
	}
}
