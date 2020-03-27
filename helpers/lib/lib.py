#!/usr/bin/env python3
# -*- coding: utf-8 -*-


import json, requests, csv
from datetime import datetime
import bcrypt, string, random
import re


## DEV
api_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImluZm9AaWFic2lzLmNvbSIsInVzZXJuYW1lIjoiaW5mb0BpYWJzaXMuY29tIiwiaWQiOiI1ZTZlMDU2OTA1NmRkMTUyMDg5OTI4NzIiLCJyb2xlIjoiYWRtaW4iLCJmaXJzdE5hbWUiOiJBZG1pbiIsImxhc3ROYW1lIjoiSUFCU0lTIiwiaWF0IjoxNTg0MjY4NzczfQ.8GItFBopfmThaWjvv-BivgeLMX40k3ZoP-ysJJfsqvM'
api_id = '5e6e0569056dd15208992872'
api_url_base = 'https://dev-medecin-hug-at-home.oniabsis.com/api/v1'






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

    def getQueues(self):
        d = self.returnAccountInfo()
        api_url = api_url_base + '/user/' + d[0]['id'] + '/allowed-queues'
        response = requests.get(api_url, headers=self.headers)
        if response.status_code == 200:
            self.queues = json.loads(response.content.decode('utf-8'))
        else:
            self.queues = None
        return response.status_code

    def delQueue(self, queueID):
        d = self.returnAccountInfo()
        api_url = api_url_base + '/user/' + d[0]['id'] + '/allowed-queues'
        data = {"queue": queueID}
        response = requests.delete(api_url, headers=self.headers, data=json.dumps(data))
        return response.status_code


    def returnQueues(self):
        return self.queues

    def __getitem__(self, key="email"):
        return self.data[0][key]


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


class allDoctors():
    def __init__(self):
        self.headers = {'Content-Type': 'application/json',
           'id': api_id,
           'x-access-token': api_token}
        self.data = self.getAccountInfo(filter='role=doctor&limit=1000')

    def getAccountInfo(self, filter):
        
        api_url = api_url_base + '/user?' + filter
        response = requests.get(api_url, headers=self.headers)

        if response.status_code == 200:
            return json.loads(response.content.decode('utf-8'))
        else:
            return None

    def returnAccountInfo(self):
        return self.data