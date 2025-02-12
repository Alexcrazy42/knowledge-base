<template>
  <div class="home">
    <h1>Welcome to the Home Page!</h1>
    <router-link to="/about">Go to About</router-link>
  </div>
</template>

<script>
export default {
  name: "HomePage",
};
</script>

<style scoped>
h1 {
  color: #42b983;
}
</style>
