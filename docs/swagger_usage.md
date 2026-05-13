# Swagger API Documentation Guide

Swagger (OpenAPI) provides a highly interactive and user-friendly web interface for exploring and testing your API endpoints directly from the browser. 

Here is how you can use the Swagger UI in your CirrusBoard application.

## 1. Rebuild the Docker Image
Because we added new npm dependencies (`@nestjs/swagger` and `swagger-ui-express`) and added a lot of new code, your local Docker image needs to be updated. Since your `docker-compose.yml` does not mount your source code as a volume, the container was simply running the **old** code without the Swagger setup, which is why you received a `404 Not Found` error.

Please stop your current `docker compose up` process (by pressing `Ctrl + C`) and run the following command to rebuild the image and start the container:

```bash
docker compose up --build
```

## 2. Accessing Swagger
Once the container is up and running, you can access the Swagger UI by navigating to the following URL in your web browser:

[**http://localhost:3001/api/docs**](http://localhost:3001/api/docs)

*(Note: We use port `3001` because your `docker-compose.yml` maps your machine's port `3001` to the container's internal port `3000` (`3001:3000`).)*

## 3. How to Use Swagger UI
When you open the page, you will see a list of sections categorized by tags like **Users**, **Projects**, **Tasks**, and **Comments**.

### Exploring Endpoints
- Click on any tag (e.g., **Tasks**) to expand and see all available routes for that module.
- Each route shows the HTTP method (`GET`, `POST`, `PATCH`, `DELETE`) and the path.
- Clicking on a specific route will expand it to show:
  - **Parameters**: Any required URL parameters (like `:id`).
  - **Request Body**: The expected JSON payload (structured perfectly because we added DTOs).
  - **Responses**: The possible status codes and response models.

### Testing Endpoints (Try it out)
You can make actual HTTP requests to your backend right from this page:
1. Click the **Try it out** button in the top right corner of the expanded endpoint section.
2. Fill in the required fields (e.g., provide a valid `id` or modify the JSON Request body).
3. Click the big blue **Execute** button.
4. Swagger will send the request to your local server and display the server's **Response body** and **Status code** immediately below.

> [!NOTE]  
> **Authentication Bypass**: Currently, we have set up the controllers to use a "Dummy Manager" user. This means you do not need to provide any Authorization headers or tokens to test the endpoints in Swagger right now; all requests will simulate being sent by a Manager and interact with your DynamoDB local instance directly!
