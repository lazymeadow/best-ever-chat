package com.bestevarchat.login

import android.app.AlertDialog
import android.content.Intent
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import androidx.lifecycle.ViewModelProvider
import com.bestevarchat.chat.ChatActivity
import com.bestevarchat.R

class LogInActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.activity_log_in)
        val viewModel = ViewModelProvider(this).get(LogInViewModel::class.java)

        viewModel.authenticateResponse.observe(this, {
            println("Response: {success: ${it.success}, message: ${it.message}}")

            if (it.success) {
                startActivity(Intent(this, ChatActivity::class.java))
                finish()
            } else {
                AlertDialog.Builder(this)
                    .setTitle("Oh no!")
                    .setMessage("Something went wrong!")
                    .setPositiveButton("OK") { dialog, _ ->
                        dialog.cancel()
                    }
                    .create()
                    .show()
            }
        })

        findViewById<Button>(R.id.buttonLogIn).setOnClickListener {
            viewModel.authenticate(
                findViewById<EditText>(R.id.editUsername).text.toString(),
                findViewById<EditText>(R.id.editPassword).text.toString()
            )
        }
    }
}
