import { useParams, Navigate } from "react-router-dom";
import DeviceSnapshotPage from "../pages/DeviceSnapshotPage";

export default function DeviceSnapshotRoute(){
    const {deviceId} = useParams<{deviceId:string}>();

    if(!deviceId){
        return<Navigate to="/app" replace/>;
    }
    return <DeviceSnapshotPage deviceId={deviceId}/>;
}