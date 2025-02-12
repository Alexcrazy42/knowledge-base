<template>
  <div class="container">
    <h1>Добро пожаловать в Vue с SCSS!</h1>
  </div>
</template>

<script>
export default {
  name: "AboutPage",
};
</script>

<style lang="scss">
$primary-color: #42b983;
$secondary-color: #35495e;

.container {
  background-color: $primary-color;
  color: $secondary-color;
  padding: 20px;
}
</style>