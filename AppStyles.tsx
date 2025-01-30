import { StyleSheet } from 'react-native';


export const appStyles = StyleSheet.create({
    emoji: {
        fontSize: 24,
    },
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f4f4f4',
    },
    listItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#ddd',
    },
    deleteButton: {
        padding: 5,
    },
    deleteText: {
        fontSize: 18,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 20,
    },
    section: {
        marginBottom: 20,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
    },
    listItem: {
        flex: 1,
        fontSize: 16,
        backgroundColor: '#fff',
        borderColor: '#ddd',
    },
    emptyList: {
        textAlign: 'center',
        marginVertical: 20,
        fontStyle: 'italic',
        color: '#888',
    },
    settingsButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1,
    },
    modalContainer: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    configItem: {
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
});
