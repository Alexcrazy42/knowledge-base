<template>
  <div id="app">
    <nav>
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </nav>
    <router-view /> <!-- Здесь будет отображаться контент в зависимости от маршрута -->
  </div>
</template>

<script>
export default {
  name: 'App',
};
</script>

<style>
nav {
  margin: 20px;
  font-size: 18px;
}

router-link {
  margin: 0 10px;
  text-decoration: none;
  color: #42b983;
}

router-link:hover {
  text-decoration: underline;
}
</style>
