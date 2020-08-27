#!/usr/bin/env python3
# -*- coding: utf-8 -*-


import json, requests, csv
from datetime import datetime
import bcrypt, string, random
import re
import time

## DEV
api_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImluZm9AaWFic2lzLmNvbSIsInVzZXJuYW1lIjoiaW5mb0BpYWJzaXMuY29tIiwiaWQiOiI1ZTZlMDU2OTA1NmRkMTUyMDg5OTI4NzIiLCJyb2xlIjoiYWRtaW4iLCJmaXJzdE5hbWUiOiJBZG1pbiIsImxhc3ROYW1lIjoiSUFCU0lTIiwiaWF0IjoxNTg0MjY4NzczfQ.8GItFBopfmThaWjvv-BivgeLMX40k3ZoP-ysJJfsqvM'
api_id = '5e6e0569056dd15208992872'
api_url_base = 'https://dev-medecin-hug-at-home.oniabsis.com/api/v1'

## PROD HUG@Home
#api_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImluZm9AaWFic2lzLmNvbSIsInVzZXJuYW1lIjoiaW5mb0BpYWJzaXMuY29tIiwiaWQiOiI1ZTZlYWZjNzUxZjExMzNjMmQyZTc1OWUiLCJyb2xlIjoiYWRtaW4iLCJmaXJzdE5hbWUiOiJPbGl2aWVyIiwibGFzdE5hbWUiOiJCSVRTQ0giLCJpYXQiOjE1ODQzMTI0NTB9.J82su85BPIEswHePg3mbwRZVCba4u5GLRIYz5BqU1QU'
#api_id = '5e6eafc751f1133c2d2e759e'
#api_url_base = 'https://hug-at-home.ch/api/v1'

## PROD DOCTEUR@Home
#api_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImluZm9AaWFic2lzLmNvbSIsImlkIjoiNWU3N2NhYmRjMzQ0ZWUyYjc1ODg0ZjhkIiwicm9sZSI6ImFkbWluIiwiZmlyc3ROYW1lIjoiSWFic2lzIiwibGFzdE5hbWUiOiJBZG1pbiIsImlhdCI6MTU4NDkwODk5N30.VypI0tSCWFXwkSOkyTffKr2Jd1J-bvhpzWUjqHb3CQk'
#api_id = '5e77cabdc344ee2b75884f8d'
#api_url_base = 'https://docteur-at-home.ch/api/v1'

## PROD HCW@Home (Demo)
#api_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImluZm9AaWFic2lzLmNvbSIsInVzZXJuYW1lIjoiaW5mb0BpYWJzaXMuY29tIiwiaWQiOiI1ZWFhYzJkOGRhOGI0ZjI2YmUzZmE2OTgiLCJyb2xlIjoiYWRtaW4iLCJmaXJzdE5hbWUiOiJBZG1pbiIsImxhc3ROYW1lIjoiSUFCU0lTIiwicGhvbmVOdW1iZXIiOiIiLCJpYXQiOjE1ODgyNDk2MjF9.xngg93FewFFFGZ_L0Ahp1VjqRf1P4Uxd5WcqKgEpqn4'
#api_id = '5eaac2d8da8b4f26be3fa698'
#api_url_base = 'https://demo.hcw-at-home.com/api/v1'


## PROD IMAD@Home
#api_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGh1Zy1hdC1ob21lLmNoIiwidXNlcm5hbWUiOiJhZG1pbkBodWctYXQtaG9tZS5jaCIsImlkIjoiNWViM2I2NWU5ZWNhY2E0YmE2MmI4MDgxIiwicm9sZSI6ImFkbWluIiwiZmlyc3ROYW1lIjoiQURNSU4iLCJsYXN0TmFtZSI6IkhVRyIsInBob25lTnVtYmVyIjoiIiwiaWF0IjoxNTg4ODM1OTk5fQ.WBToRDHBwSIYSHp0-f1Eje7TMhE4g9cY_5jCWyFnTb4'
#api_id = '5eb3b65e9ecaca4ba62b8081'
#api_url_base = 'https://imad.hug-at-home.ch/api/v1'





print("UPDATING URL (in 5 seconds): " + api_url_base)
time.sleep(5)


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

        api_url = api_url_base + '/queue?limit=100'
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
