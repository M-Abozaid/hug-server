#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
This script simply returns the amount of call with an output usable by Nagios.
"""

from pymongo import MongoClient
from pprint import pprint
import datetime

conn = MongoClient('mongodb://localhost:27017/')
db = conn['hug-home']

oneHourAgo = datetime.datetime.now() - datetime.timedelta(hours=1)

query = {"type":{"$in":['videoCall', 'audioCall']}, "$or": [{"closedAt":{"$exists":False}},{"closedAt":0}], "acceptedAt":{"$ne":0}, "createdAt":{"$gt": oneHourAgo }}
query = {"type":{"$in":["videoCall", "audioCall"]}, "$or": [{"closedAt":{"$exists":False}},{"closedAt":0}], "acceptedAt":{"$ne":0}}
message = db['message']

call = message.find(query)

print("OK | call=" + str(call.count()))
