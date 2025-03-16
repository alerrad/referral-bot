FROM python:3.12-slim

WORKDIR /bot

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ARG BOT_TOKEN=""
ARG POSTGRESQL_URI=""
ARG REDIS_HOST=""

ENV BOT_TOKEN=${BOT_TOKEN}
ENV POSTGRESQL_URI=${POSTGRESQL_URI}
ENV REDIS_HOST=${REDIS_HOST}