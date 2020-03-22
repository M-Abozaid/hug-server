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
api_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImluZm9AaWFic2lzLmNvbSIsInVzZXJuYW1lIjoiaW5mb0BpYWJzaXMuY29tIiwiaWQiOiI1ZTZlMDU2OTA1NmRkMTUyMDg5OTI4NzIiLCJyb2xlIjoiYWRtaW4iLCJmaXJzdE5hbWUiOiJBZG1pbiIsImxhc3ROYW1lIjoiSUFCU0lTIiwiaWF0IjoxNTg0MjY4NzczfQ.8GItFBopfmThaWjvv-BivgeLMX40k3ZoP-ysJJfsqvM'
api_id = '5e6e0569056dd15208992872'
api_url_base = 'https://dev-medecin-hug-at-home.oniabsis.com/api/v1'

## letters is used to indicate what caraters can be used in password
letters = string.ascii_letters + string.digits + string.punctuation

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
        
        if not password == "" and not password == " ":
            d["password"] = hashPassword(password)

        if email == "":
            continue
        else:
            r = accounts(email)

        ## Update or Create user
        if r.returnAccountInfo():
            s = r.updateAccount(d)
            print(str(s) + " : ### UPDATE " + email)
        else:
            if not "hcuge.ch" in email:
                try: d["password"]
                except:
                    password = ''.join(random.choice(letters) for i in range(stringLength))
                    d["password"] = hashPassword(password)
            
            s = r.createAccount(d)
            print(str(s) + " : ### CREATE " + email + " / " + password)
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
