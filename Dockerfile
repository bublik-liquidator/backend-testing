# Use the official Node.js 18.12.1 image as the base image
FROM node:18.12.1

# Set the working directory for the app
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install the app dependencies
RUN npm install

# Rebuild bcrypt for the current system architecture
RUN npm rebuild bcrypt --build-from-source

# Copy the rest of the app files
COPY . .

# Expose port 3000 for the app to listen on
EXPOSE 3000

# Start the app
CMD [ "node", "back.js" ]
