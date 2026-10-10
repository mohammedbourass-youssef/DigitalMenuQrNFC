FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL
ARG VITE_BASE_DOMAIN
ARG VITE_DEV_TENANT
ARG VITE_USE_MOCK
ARG VITE_MOCK_ORDER_LINE
ENV VITE_API_URL=$VITE_API_URL \
    VITE_BASE_DOMAIN=$VITE_BASE_DOMAIN \
    VITE_DEV_TENANT=$VITE_DEV_TENANT \
    VITE_USE_MOCK=$VITE_USE_MOCK \
    VITE_MOCK_ORDER_LINE=$VITE_MOCK_ORDER_LINE
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
