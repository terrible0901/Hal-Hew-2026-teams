from flask import Flask, render_template, request, redirect, url_for, flash
from werkzeug.security import generate_password_hash
import mysql.connector

app = Flask(__name__)

app.config['SECRET_KEY'] = 'korehahimituki-dayo'

def connect_sql() :
    return mysql.connector.connect(
        host = "localhost",
        user = "root",
        password = "",
        database = "hew"
    )