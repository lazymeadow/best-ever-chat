package com.bestevarchat.chat

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bestevarchat.R

// TODO: "General" shouldn't be hardcoded anywhere in here. Nope. We should handle all the rooms.
class MessagesAdapter : RecyclerView.Adapter<MessagesAdapter.MessagesViewHolder>() {
	init {
		MessagesProvider.onDataSetChanged("General") { this.notifyDataSetChanged() }
	}

	class MessagesViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
		/**
		 * Binds a chat message's information to a UI element
		 *
		 * @param chatMessage The message to display in the UI
		 */
		fun bind(chatMessage: ChatMessage) {
			itemView.findViewById<TextView>(R.id.message).text = itemView.context.getString(
				R.string.text_message,
				chatMessage.username,
				chatMessage.message
			)
		}
	}

	override fun getItemCount(): Int {
		return MessagesProvider.getMessages("General").size
	}

	override fun onBindViewHolder(holder: MessagesViewHolder, position: Int) {
		val message = MessagesProvider.getMessages("General")[position]
		holder.bind(message)
	}

	override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessagesViewHolder {
		val inflater = LayoutInflater.from(parent.context)
		val rootView = inflater.inflate(R.layout.item_message, parent, false)
		return MessagesViewHolder(rootView)
	}
}
