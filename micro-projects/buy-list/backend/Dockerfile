FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build

WORKDIR /app

COPY BuyList.sln ./
COPY BuyList/*.csproj BuyList/

RUN dotnet restore

COPY . .
RUN dotnet publish BuyList/BuyList.csproj -c Release -o out

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime

WORKDIR /app

ENV ASPNETCORE_HTTP_PORTS=5000
EXPOSE 5000

COPY --from=build /app/out .

ENTRYPOINT ["dotnet", "BuyList.dll"]