from flask import Flask, render_template, request, redirect, url_for, flash
from werkzeug.security import generate_password_hash
import mysql.connector, users

app = Flask(__name__)

def connect_sql() :
    return mysql.connector.connect(
        host = "localhost",
        user = "root",
        password = "",
        database = "hew"
    )