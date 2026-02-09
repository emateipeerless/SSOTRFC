import { useParams, Navigate } from "react-router-dom";
import DeviceEventsPage from "../pages/DeviceEventsPage";

export default function DeviceEventRoute(){
    const {deviceId} = useParams<{deviceId:string}>();

    if(!deviceId){
        return<Navigate to="/app" replace/>;
    }
    return <DeviceEventsPage deviceId={deviceId}/>;
}