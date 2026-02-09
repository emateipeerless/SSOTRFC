import { useParams, Navigate } from "react-router-dom";
import DeviceSettingsPage from "../pages/DeviceSettingsPage";

export default function DeviceSettingsRoute(){
    const {deviceId} = useParams<{deviceId:string}>();

    if(!deviceId){
        return<Navigate to="/app" replace/>;
    }
    return <DeviceSettingsPage deviceId={deviceId}/>;
}