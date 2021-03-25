package com.bestevarchat

import java.io.BufferedInputStream
import java.io.ByteArrayOutputStream
import java.io.InputStream

fun readStream(inputStream: InputStream): String {
    val bis = BufferedInputStream(inputStream)
    val os = ByteArrayOutputStream()

    var result = bis.read()
    while (result != -1) {
        os.write(result)
        result = bis.read()
    }

    return os.toString()
}