FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 MX11_DATA_DIR=/app/data
RUN addgroup -S -g 1001 mx11 && adduser -S -u 1001 -G mx11 mx11 && mkdir /app/data && chown mx11:mx11 /app/data
COPY package.json ./
COPY server ./server
COPY public ./public
USER mx11
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["node", "server/index.js"]
