# -----------------------------
# Stage 1: Build
# -----------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build arguments
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_AUTH_URL

# Make build args available to Vite
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_AUTH_URL=$VITE_AUTH_URL

# Temporary debug (remove after confirming).
RUN echo "================================"
RUN echo "VITE_API_URL=$VITE_API_URL"
RUN echo "VITE_AUTH_URL=$VITE_AUTH_URL"
RUN echo "VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID"
RUN echo "================================"

RUN npm run build

# -----------------------------
# Stage 2: Nginx
# ------------------------------
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]