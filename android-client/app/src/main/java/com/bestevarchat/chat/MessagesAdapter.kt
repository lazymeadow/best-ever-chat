package com.bestevarchat.chat

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bestevarchat.R

class MessagesAdapter : RecyclerView.Adapter<MessagesAdapter.MessagesViewHolder>() {
	init {
		MessagesProvider.onDataSetChanged { this.notifyDataSetChanged() }
	}

	class MessagesViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
		fun bind(chatMessage: ChatMessage) {
			itemView.findViewById<TextView>(R.id.message).text = chatMessage.text
		}
	}

	override fun getItemCount(): Int = MessagesProvider.getMessages().size

	override fun onBindViewHolder(holder: MessagesViewHolder, position: Int) {
		val message = MessagesProvider.getMessages()[position]
		holder.bind(message)
	}

	override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessagesViewHolder {
		val inflater = LayoutInflater.from(parent.context)
		val rootView = inflater.inflate(R.layout.item_message, parent, false)
		return MessagesViewHolder(rootView)
	}
}
