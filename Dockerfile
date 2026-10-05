FROM node:22-slim
WORKDIR /app
COPY server ./server
COPY dist ./dist
ENV NAWA_DB=/data/nawa.sqlite PORT=8787
VOLUME /data
EXPOSE 8787
CMD ["node","--no-warnings","server/server.js"]
