import { ActivityIndicator, View } from "react-native";


export default function Loader() {
    return (
        <View style={{ flex: 1, backgroundColor: "#f2f2f2" }}>
            <ActivityIndicator size={"large"} color={"blue"} />
        </View>
    )
}