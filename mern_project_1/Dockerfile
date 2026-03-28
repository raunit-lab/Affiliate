# mern_project_1/Dockerfile
# Stage 1: Build
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Ensure your Vite app builds for production
RUN npm run build 

# Stage 2: Serve with Nginx
FROM nginx:alpine
# Copy the built dist folder to Nginx's web root
COPY --from=build /app/dist /usr/share/nginx/html
# Expose port 80 for Traefik to connect to
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]