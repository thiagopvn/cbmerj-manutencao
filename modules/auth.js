const authModule = {
    async logout() {
        try {
            await firebase.auth().signOut();
            localStorage.removeItem('cbmerj_org');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    },

    async getCurrentUser() {
        return new Promise((resolve) => {
            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });
    },

    async checkPermission(action) {
        const user = await this.getCurrentUser();
        if (!user) return false;
        
        try {
            const userDoc = await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .get();
            
            const userData = userDoc.data();
            return userData && userData.permissions && userData.permissions.includes(action);
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            return false;
        }
    },

    async updateUserProfile(data) {
        const user = await this.getCurrentUser();
        if (!user) throw new Error('Usuário não autenticado');
        
        try {
            await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .update({
                    ...data,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            throw error;
        }
    }
};