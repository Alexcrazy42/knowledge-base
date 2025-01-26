FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build

WORKDIR /app


COPY RealTimeChat.sln ./
COPY RealTimeChat/*.csproj RealTimeChat/

RUN dotnet restore


COPY . .
RUN dotnet publish RealTimeChat/RealTimeChat.csproj -c Release -o out


FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime

WORKDIR /app

ENV ASPNETCORE_HTTP_PORTS=5000
EXPOSE 5000

COPY --from=build /app/out .

ENTRYPOINT ["dotnet", "RealTimeChat.dll"]
