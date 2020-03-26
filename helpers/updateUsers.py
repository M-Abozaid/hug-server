#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
This script is provided as helper to easily manage users by using API.
You will need to enable admin access on HUG@Home before.

Current limitations:

* This script currently NOT delete any account
* This script currently NOT delete queue associated to a user
"""


import json, requests, csv
from datetime import datetime
import bcrypt, string, random
import re

csv_file_path="liste.csv"



## letters is used to indicate what caraters can be used in password
letters = string.ascii_letters + string.digits

class queues():

    def __init__(self):
        self.headers = {'Content-Type': 'application/json',
           'id': api_id,
           'x-access-token': api_token}
        
        self.data = self.getQueues()

    def getQueues(self):

        api_url = api_url_base + '/queue'
        response = requests.get(api_url, headers=self.headers)

        if response.status_code == 200:
            return json.loads(response.content.decode('utf-8'))
        else:
            return None

    def returnQueues(self):
        return self.data

    def returnID(self, name):
        for i in self.data:
            if i["name"] == name:
                return i["id"]
        else:
            return None


class accounts():

    def __init__(self, email):
        self.headers = {'Content-Type': 'application/json',
           'id': api_id,
           'x-access-token': api_token}
        self.email = email
        self.data = self.getAccountInfo(filter='role=doctor&email='+self.email)


    def getAccountInfo(self, filter):
        
        api_url = api_url_base + '/user?' + filter
        response = requests.get(api_url, headers=self.headers)

        if response.status_code == 200:
            return json.loads(response.content.decode('utf-8'))
        else:
            return None

    def refreshAccountInfo(self):
        self.data = self.getAccountInfo(filter='role=doctor&email='+self.email)

    def returnAccountInfo(self):
        return self.data

    def countAccount(self):
        return self.data.count('')
    
    def createAccount(self,data):
        api_url = api_url_base + '/user'
        response = requests.post(api_url, headers=self.headers, json=data)
        return response.status_code

    def updateAccount(self,data):
        d = self.returnAccountInfo()
        api_url = api_url_base + '/user/' + d[0]['id']
        response = requests.put(api_url, headers=self.headers, data=json.dumps(data))
        return response.status_code

    def addToQueue(self,queueID):
        d = self.returnAccountInfo()
        api_url = api_url_base + '/user/' + d[0]['id'] + '/allowed-queues'
        data = {"queue": queueID}
        response = requests.post(api_url, headers=self.headers, data=json.dumps(data))
        return response.status_code


def hashPassword(password):
    p = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    return p.decode()

def genPassword():
    return''.join(random.choice(letters) for i in range(10))

q = queues()

with open(csv_file_path, newline='') as content:
    table = csv.reader(content, delimiter=',', quotechar='|')
    for row in table:
        lastname = row[0]
        firstname = row[1]
        email = row[2]
        authPhoneNumber = row[3]
        phoneNumber = row[4]
        password = row[5]
        queues = row[6]

        d = {
            "role": "doctor",
            "firstName": firstname,
            "lastName": lastname,
            "email": email,
            "username": email,
            "authPhoneNumber": authPhoneNumber,
            "phoneNumber": phoneNumber
            }

        ## Replace only if password is set
        if email == "":
            continue
        elif not "hcuge.ch" in email:
            email = email.lower()
            d["email"] = d["email"].lower()
            if password == "" or password == " ":
                genpassword = genPassword()
                password = None
            else:
                genpassword = None
        else:
            password = None
            genpassword = None

        r = accounts(email)


        if r.returnAccountInfo():
            ## Update User
            if password:
                d["password"] = hashPassword(password)
            s = r.updateAccount(d)

            if password:
                print(str(s) + " : ### UPDATE " + d["email"] + " / " + password)
            else:
                print(str(s) + " : ### UPDATE " + d["email"])
        else:
            ## Create user
            if password:
                d["password"] = password
            elif genpassword:
                d["password"] = genpassword
                password = genpassword
            s = r.createAccount(d)

            if password:
                print(str(s) + " : ### CREATE " + d["email"] + " / " + password)
            else:
                print(str(s) + " : ### CREATE " + d["email"])

            r.refreshAccountInfo()

        ## Update Queues
        if not queues == "":
            queues = queues.replace('"','')
            if not queues == None:
                for queueName in queues.split(";"):

                    ## Do a small cleanup
                    queueName = re.sub("^[\s]*", "", queueName)
                    queueName = re.sub("[\s]*$", "", queueName)

                    queueID = q.returnID(queueName)
                    if queueID:
                        s = r.addToQueue(queueID)
                        print(str(s) + " : QUEUE " + queueName)
                    else:
                        print("MISSING : QUEUE " + queueName)
