import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const option = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: '📘 API Documentation',
            version: "1.0.0",
            description: "Description API document",
            contact: {
                name : "Name",
                email: "Email",
            },
        },
        servers: [
            {
                url: "http://localhost:8887",
                description: "Local development server",
            }
        ]
    },
    apis: ["./server.js",'./routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(option);

export const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
};