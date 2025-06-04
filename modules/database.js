const database = {
    async create(collection, data) {
        try {
            const docRef = await firebase.firestore()
                .collection('organizations')
                .doc(app.currentOrg)
                .collection(collection)
                .add({
                    ...data,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: app.currentUser.uid
                });
            return docRef.id;
        } catch (error) {
            console.error('Erro ao criar documento:', error);
            throw error;
        }
    },

    async update(collection, id, data) {
        try {
            await firebase.firestore()
                .collection('organizations')
                .doc(app.currentOrg)
                .collection(collection)
                .doc(id)
                .update({
                    ...data,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: app.currentUser.uid
                });
        } catch (error) {
            console.error('Erro ao atualizar documento:', error);
            throw error;
        }
    },

    async delete(collection, id) {
        try {
            await firebase.firestore()
                .collection('organizations')
                .doc(app.currentOrg)
                .collection(collection)
                .doc(id)
                .delete();
        } catch (error) {
            console.error('Erro ao deletar documento:', error);
            throw error;
        }
    },

    async get(collection, id) {
        try {
            const doc = await firebase.firestore()
                .collection('organizations')
                .doc(app.currentOrg)
                .collection(collection)
                .doc(id)
                .get();
            
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Erro ao buscar documento:', error);
            throw error;
        }
    },

    async getAll(collection, orderBy = null, limit = null) {
        try {
            let query = firebase.firestore()
                .collection('organizations')
                .doc(app.currentOrg)
                .collection(collection);
            
            if (orderBy) {
                query = query.orderBy(orderBy.field, orderBy.direction || 'asc');
            }
            
            if (limit) {
                query = query.limit(limit);
            }
            
            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Erro ao buscar documentos:', error);
            throw error;
        }
    },

    async query(collection, filters) {
        try {
            let query = firebase.firestore()
                .collection('organizations')
                .doc(app.currentOrg)
                .collection(collection);
            
            filters.forEach(filter => {
                query = query.where(filter.field, filter.operator, filter.value);
            });
            
            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Erro ao executar consulta:', error);
            throw error;
        }
    },

    async uploadFile(file, path) {
        try {
            const fullPath = `${app.currentOrg}/${path}`;
            const ref = firebase.storage().ref(fullPath);
            
            const compressedFile = await utils.compressImage(file);
            const snapshot = await ref.put(compressedFile);
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            return {
                url: downloadURL,
                path: fullPath,
                name: file.name,
                size: file.size
            };
        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            throw error;
        }
    },

    async deleteFile(path) {
        try {
            const ref = firebase.storage().ref(path);
            await ref.delete();
        } catch (error) {
            console.error('Erro ao deletar arquivo:', error);
            throw error;
        }
    }
};