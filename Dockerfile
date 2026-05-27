# syntax=docker/dockerfile:1.7

# ---------- Stage 1: build Vite frontend ----------
FROM node:20-alpine AS frontend
WORKDIR /app/figma

COPY figma/package.json ./
RUN npm install --no-audit --no-fund

COPY figma/ ./
RUN npm run build

# ---------- Stage 2: build .NET backend ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend
WORKDIR /src

COPY server-dotnet/XBuildApi.sln ./
COPY server-dotnet/XBuildApi/XBuildApi.csproj XBuildApi/
RUN dotnet restore XBuildApi/XBuildApi.csproj

COPY server-dotnet/XBuildApi/ XBuildApi/
RUN dotnet publish XBuildApi/XBuildApi.csproj \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

# ---------- Stage 3: runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=backend /app/publish ./
COPY --from=frontend /app/figma/build ./wwwroot

ENV ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true \
    PORT=8080

EXPOSE 8080

ENTRYPOINT ["sh","-c","exec dotnet XBuildApi.dll --urls http://0.0.0.0:${PORT}"]
