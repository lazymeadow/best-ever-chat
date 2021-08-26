package com.bestevarchat.chat

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bestevarchat.R

class ChatActivity : AppCompatActivity() {
	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)

		setContentView(R.layout.activity_chat)
		ViewModelProvider(this).get(ChatViewModel::class.java)

		val layoutManager = LinearLayoutManager(
			this,
			LinearLayoutManager.VERTICAL,
			false
		)
		layoutManager.stackFromEnd = true

		val recycler = findViewById<RecyclerView>(R.id.recyclerMessages)
		recycler.adapter = MessagesAdapter(this)
		recycler.layoutManager = layoutManager
	}
}
