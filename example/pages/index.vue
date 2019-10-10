<template>
  <div>
    <h1>Hello World</h1>

    <nuxt-link to="/about">About</nuxt-link>
  </div>
</template>

<script>
export default {
  mounted() {
    console.log('Path prop has value', this.$root.path)
    console.log('hasAxios?', !!this.$axios)
  }
}
</script>
