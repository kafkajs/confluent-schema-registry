avdl_path=$1
avsc_name=$2

if [ -z "${avdl_path}" ]; then
  echo "AVDL path not defined. e.g. ./bin/protocolToSchema.sh /path/to.avdl"
  exit;
fi

docker run --rm -v "$(pwd)":/avro kpnnl/avro-tools:1.12.0 idl2schemata ${avdl_path} tmp && cat tmp/${avsc_name}.avsc
