<script setup>
// ModalShell - общая оболочка оверлея. Единый приём: слот для содержимого,
// клик по фону = отмена. Аналог ShowDialog() из C#-версий.
defineEmits(['cancel']);
</script>

<template>
    <div class="overlay" @click.self="$emit('cancel')">
        <div class="modal">
            <slot/>
        </div>
    </div>
</template>
